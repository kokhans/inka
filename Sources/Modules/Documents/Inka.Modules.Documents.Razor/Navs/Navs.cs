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
using Inka.Engine;

namespace Inka.Modules.Documents.Razor.Navs;

public sealed class Navs
{
    private readonly Dictionary<string, List<Nav>> _items;

    public Navs(Dictionary<string, List<Nav>> items)
    {
        ArgumentVerifier.NotNull(items, nameof(items));

        _items = items;
    }

    public Nav GetNavByXRef(string xRef, string subRoute = "/")
    {
        ArgumentVerifier.NotNull(xRef, nameof(xRef));
        ArgumentVerifier.NotNull(subRoute, nameof(subRoute));
        ArgumentVerifier.Requires(
            !subRoute.Equals(Predefined.Nav.AllSubRoutesPattern),
            "Sub route pattern '*' is not valid for current operation."
        );

        List<Nav> navs = GetNavsBySubRoute(subRoute);

        return navs.Single(n =>
            n.FrontMatter?.XRef != null && n.FrontMatter.XRef.Equals(xRef, StringComparison.InvariantCultureIgnoreCase)
        );
    }

    public List<Nav> GetNavsBySubRoute(string subRoute = "/")
    {
        ArgumentVerifier.NotNull(subRoute, nameof(subRoute));

        if (subRoute.Equals(Predefined.Nav.AllSubRoutesPattern, StringComparison.InvariantCultureIgnoreCase))
            return _items
                .Where(kvp => kvp.Key == string.Empty)
                .SelectMany(kvp => kvp.Value)
                .ToList();

        return _items[subRoute];
    }
}