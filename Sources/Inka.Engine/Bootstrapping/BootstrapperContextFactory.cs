// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using System.Collections.ObjectModel;
using System.Reflection;
using Carcass.Core.Helpers;
using Inka.Engine.Modules;
using Inka.Engine.Modules.Abstracts;
using Inka.Engine.Options;
using Inka.Engine.Pipelines;
using Inka.Engine.VirtualObjects.Providers.Abstracts;
using Inka.Engine.VirtualObjects.Providers.Local;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Inka.Engine.Bootstrapping;

public static class BootstrapperContextFactory
{
    public static BootstrapperContext New()
    {
        string basePath = Path.Combine(Environment.CurrentDirectory, Predefined.Directory.WwwRoot);
        string inputPath = Path.GetFullPath(Path.Combine(basePath, Predefined.Directory.Input));
        string outputPath = Path.GetFullPath(Path.Combine(basePath, Predefined.Directory.Output));

        IConfigurationRoot configuration = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile($"{inputPath}/inka.json", false)
            .Build();

        BootstrapperContext bootstrapperContext = new(configuration);

        bootstrapperContext.Services.AddOptions();

        SiteOptions options = new();
        configuration.Bind(options);

        bootstrapperContext.Services
            .AddSingleton(options)
            .AddCarcassSpectreCliLogger()
            .AddCarcassLocalStorageProvider()
            .AddSingleton<IVirtualObjectProvider>(_ => new LocalVirtualObjectProvider(
                    new LocalVirtualObjectProviderMetadata(basePath, Predefined.Directory.Input)
                )
            )
            .AddSingleton(_ => new PipelineContext(
                    inputPath,
                    outputPath,
                    options.SiteTitle
                )
            );

        // Discover modules from loaded assemblies and register them in module store.
        ModuleStore moduleStore = new();
        ReadOnlyCollection<TypeInfo>? moduleTypeInfos = AssemblyHelper.GetTypeInfosFromLoadedAssemblies(
            AssemblyHelper.GetLoadedAssemblies(),
            ti => typeof(IModule).IsAssignableFrom(ti) && ti.IsClass && !ti.IsAbstract
        );
        if (moduleTypeInfos is null || !moduleTypeInfos.Any())
            throw new ApplicationException("Modules are not loaded from assemblies.");
        foreach (TypeInfo moduleTypeInfo in moduleTypeInfos)
            moduleStore.AddModule(moduleTypeInfo);
        bootstrapperContext.Services.AddSingleton(moduleStore);

        return bootstrapperContext;
    }
}