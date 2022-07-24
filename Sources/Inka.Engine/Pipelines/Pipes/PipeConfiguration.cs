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

using Carcass.Core;

namespace Inka.Engine.Pipelines.Pipes;

public sealed class PipeConfiguration
{
    private readonly Dictionary<string, object> _metadata;

    private PipeConfiguration(Dictionary<string, object> metadata)
    {
        ArgumentVerifier.NotNull(metadata, nameof(metadata));

        _metadata = metadata;
    }

    public void Upsert(string key, object value)
    {
        ArgumentVerifier.NotNull(key, nameof(key));

        if (_metadata.ContainsKey(key))
            _metadata[key] = value;
        else
            _metadata.Add(key, value);
    }

    public T Get<T>(string key)
    {
        ArgumentVerifier.NotNull(key, nameof(key));

        return (T) _metadata[key];
    }

    public T? TryGet<T>(string key)
    {
        ArgumentVerifier.NotNull(key, nameof(key));

        _metadata.TryGetValue(key, out object? value);

        return (T?) value;
    }

    public static PipeConfiguration New() => new(new Dictionary<string, object>
        {
            {Predefined.PipeConfiguration.CopyFromDisk, new List<string>()},
            {Predefined.PipeConfiguration.CopyFromContext, new List<string>()},
            {Predefined.PipeConfiguration.CopyToDisk, false},
            {Predefined.PipeConfiguration.PreventReadContent, false},
        }
    );
}